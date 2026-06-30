package app.secureshare.mobile;

import android.os.Environment;
import android.util.Base64;

import com.frostwire.jlibtorrent.FileStorage;
import com.frostwire.jlibtorrent.AlertListener;
import com.frostwire.jlibtorrent.SessionParams;
import com.frostwire.jlibtorrent.SessionManager;
import com.frostwire.jlibtorrent.SettingsPack;
import com.frostwire.jlibtorrent.Sha1Hash;
import com.frostwire.jlibtorrent.TorrentHandle;
import com.frostwire.jlibtorrent.TorrentInfo;
import com.frostwire.jlibtorrent.TorrentStatus;
import com.frostwire.jlibtorrent.TorrentStatus.State;
import com.frostwire.jlibtorrent.alerts.Alert;
import com.frostwire.jlibtorrent.alerts.AlertType;
import com.frostwire.jlibtorrent.alerts.ListenFailedAlert;
import com.frostwire.jlibtorrent.swig.settings_pack;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "NativeTorrent")
public class NativeTorrentPlugin extends Plugin {
    private static final String DHT_BOOTSTRAP_NODES = String.join(
        ",",
        "router.bittorrent.com:6881",
        "router.utorrent.com:6881",
        "dht.transmissionbt.com:6881",
        "dht.libtorrent.org:25401"
    );
    private static final String LISTEN_INTERFACES = "0.0.0.0:0";
    private final Map<String, NativeTorrentJob> jobs = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private volatile String lastNativeAlert;
    private SessionManager session;

    @Override
    public void load() {
        scheduler.scheduleAtFixedRate(this::emitUpdates, 1, 1, TimeUnit.SECONDS);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("platform", "android");
        call.resolve(result);
    }

    @PluginMethod
    public void startTorrent(PluginCall call) {
        String id = call.getString("id");
        String source = call.getString("source");
        String sourceType = call.getString("sourceType");

        if (id == null || source == null || sourceType == null) {
            call.reject("Torrent id, source, and source type are required.");
            return;
        }

        try {
            ensureSession();

            NativeTorrentJob existing = jobs.get(id);
            if (existing != null) {
                existing.status = "running";
                TorrentHandle handle = existing.handle();
                if (handle != null && handle.isValid()) {
                    handle.resume();
                }
                emitUpdate(id);
                call.resolve();
                return;
            }

            NativeTorrentJob job = new NativeTorrentJob(id);
            job.status = "running";
            jobs.put(id, job);

            if ("magnet".equals(sourceType)) {
                session.download(source, downloadRoot());
                job.infoHash = com.frostwire.jlibtorrent.AddTorrentParams.parseMagnetUri(source)
                    .infoHash();
            } else if ("torrent-file".equals(sourceType)) {
                TorrentInfo torrentInfo = new TorrentInfo(Base64.decode(source, Base64.DEFAULT));
                session.download(torrentInfo, downloadRoot());
                job.infoHash = torrentInfo.infoHash();
            } else {
                jobs.remove(id);
                call.reject("Unsupported torrent source type.");
                return;
            }

            emitUpdate(id);
            call.resolve();
        } catch (RuntimeException error) {
            jobs.remove(id);
            call.reject(error.getMessage() == null ? "Unable to start torrent." : error.getMessage());
        }
    }

    @PluginMethod
    public void pauseTorrent(PluginCall call) {
        NativeTorrentJob job = jobs.get(call.getString("id"));

        if (job != null) {
            job.status = "paused";
            TorrentHandle handle = job.handle();
            if (handle != null && handle.isValid()) {
                handle.pause();
            }
            emitUpdate(job.id);
        }

        call.resolve();
    }

    @PluginMethod
    public void resumeTorrent(PluginCall call) {
        NativeTorrentJob job = jobs.get(call.getString("id"));

        if (job != null) {
            job.status = "running";
            TorrentHandle handle = job.handle();
            if (handle != null && handle.isValid()) {
                handle.resume();
            }
            emitUpdate(job.id);
        }

        call.resolve();
    }

    @PluginMethod
    public void cancelTorrent(PluginCall call) {
        String id = call.getString("id");
        NativeTorrentJob job = jobs.remove(id);

        if (job != null) {
            TorrentHandle handle = job.handle();
            if (handle != null && handle.isValid()) {
                session.remove(handle);
            }
        }

        call.resolve();
    }

    private synchronized void ensureSession() {
        if (session != null && session.isRunning()) {
            return;
        }

        SettingsPack settings = new SettingsPack()
            .enableDht(true)
            .listenInterfaces(LISTEN_INTERFACES)
            .broadcastLSD(true)
            .connectionsLimit(200)
            .activeDownloads(8)
            .activeDhtLimit(88)
            .activeTrackerLimit(88)
            .activeLsdLimit(60);

        settings.setBoolean(settings_pack.bool_types.announce_to_all_trackers.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.announce_to_all_tiers.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.enable_incoming_tcp.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.enable_incoming_utp.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.enable_outgoing_tcp.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.enable_outgoing_utp.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.listen_system_port_fallback.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.prefer_udp_trackers.swigValue(), true);
        settings.setBoolean(settings_pack.bool_types.use_dht_as_fallback.swigValue(), true);
        settings.setInteger(settings_pack.int_types.max_retry_port_bind.swigValue(), 20);
        settings.setString(
            settings_pack.string_types.dht_bootstrap_nodes.swigValue(),
            DHT_BOOTSTRAP_NODES
        );

        session = new SessionManager();
        session.addListener(nativeAlertListener());
        session.start(new SessionParams(settings));
        session.listenInterfaces(LISTEN_INTERFACES);
        session.reopenNetworkSockets();
        session.startDht();
    }

    private AlertListener nativeAlertListener() {
        return new AlertListener() {
            @Override
            public int[] types() {
                return new int[] {
                    AlertType.DHT_BOOTSTRAP.swig(),
                    AlertType.DHT_ERROR.swig(),
                    AlertType.LISTEN_FAILED.swig(),
                    AlertType.LISTEN_SUCCEEDED.swig(),
                    AlertType.METADATA_FAILED.swig(),
                    AlertType.METADATA_RECEIVED.swig(),
                    AlertType.SESSION_ERROR.swig(),
                    AlertType.TRACKER_ERROR.swig(),
                    AlertType.TRACKER_REPLY.swig(),
                    AlertType.UDP_ERROR.swig()
                };
            }

            @Override
            public void alert(Alert<?> alert) {
                if (alert instanceof ListenFailedAlert) {
                    ListenFailedAlert failed = (ListenFailedAlert) alert;
                    lastNativeAlert = String.format(
                        "%s: %s %s:%d (%s)",
                        alert.type().name(),
                        failed.operation().name(),
                        failed.address(),
                        failed.port(),
                        failed.error().message()
                    );
                    return;
                }

                lastNativeAlert = alert.type().name() + ": " + alert.message();
            }
        };
    }

    private File downloadRoot() {
        File externalDownloads = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        File root = new File(externalDownloads == null ? getContext().getFilesDir() : externalDownloads, "SecureShare/Torrents");
        if (!root.exists() && !root.mkdirs()) {
            throw new IllegalStateException("Unable to create torrent download directory.");
        }

        return root;
    }

    private void emitUpdates() {
        for (String id : jobs.keySet()) {
            emitUpdate(id);
        }
    }

    private void emitUpdate(String id) {
        NativeTorrentJob job = jobs.get(id);
        if (job == null || job.infoHash == null || session == null) {
            return;
        }

        TorrentHandle handle = job.handle();
        if (handle == null || !handle.isValid()) {
            handle = session.find(job.infoHash);
            job.handle = handle;
        }

        if (handle == null || !handle.isValid()) {
            return;
        }

        if (!job.discoveryKicked && "running".equals(job.status)) {
            handle.forceReannounce();
            handle.forceDHTAnnounce();
            job.discoveryKicked = true;
        }

        TorrentStatus status = handle.status();
        JSObject update = new JSObject();
        update.put("id", id);
        update.put("announcingToDht", status.announcingToDht());
        update.put("announcingToTrackers", status.announcingToTrackers());
        update.put("connectCandidates", status.connectCandidates());
        update.put("connections", status.numConnections());
        update.put("currentTracker", status.currentTracker());
        update.put("dhtNodes", session.dhtNodes());
        update.put("dhtRunning", session.isDhtRunning());
        update.put("downloadSpeed", status.downloadRate());
        update.put("files", files(handle));
        update.put("firewalled", session.isFirewalled());
        update.put("hasMetadata", status.hasMetadata());
        update.put("listenEndpoints", listenEndpoints());
        update.put("name", handle.name());
        update.put("nativeState", status.state().name());
        update.put("nativeAlert", lastNativeAlert);
        update.put("peers", status.numPeers());
        update.put("progress", Math.round(status.progress() * 100));
        update.put("seeds", status.numSeeds());
        update.put("sessionPaused", session.isPaused());
        update.put("status", torrentStatus(job, status));
        update.put("uploadSpeed", "paused".equals(job.status) ? 0 : status.uploadRate());

        if ("paused".equals(job.status)) {
            update.put("downloadSpeed", 0);
        }

        if (status.errorCode().value() != 0) {
            update.put("error", status.errorCode().message());
            update.put("status", "error");
        }

        if ("complete".equals(update.getString("status"))) {
            job.status = "complete";
            update.put("completedFiles", completedFiles(handle));
        }

        notifyListeners("torrentUpdate", update);
    }

    private JSArray listenEndpoints() {
        JSArray endpoints = new JSArray();
        List<String> sessionEndpoints = session.listenEndpoints();

        for (String endpoint : sessionEndpoints) {
            endpoints.put(endpoint);
        }

        return endpoints;
    }

    private String torrentStatus(NativeTorrentJob job, TorrentStatus status) {
        if ("paused".equals(job.status)) {
            return "paused";
        }

        if (status.isFinished() || status.isSeeding() || status.state() == State.FINISHED || status.state() == State.SEEDING) {
            return "complete";
        }

        return job.status;
    }

    private JSArray files(TorrentHandle handle) {
        JSArray files = new JSArray();
        TorrentInfo torrentInfo = handle.torrentFile();

        if (torrentInfo == null || !torrentInfo.isValid()) {
            return files;
        }

        FileStorage storage = torrentInfo.files();
        for (int index = 0; index < storage.numFiles(); index += 1) {
            JSObject file = new JSObject();
            file.put("length", storage.fileSize(index));
            file.put("name", storage.filePath(index));
            files.put(file);
        }

        return files;
    }

    private JSArray completedFiles(TorrentHandle handle) {
        JSArray completedFiles = new JSArray();
        TorrentInfo torrentInfo = handle.torrentFile();

        if (torrentInfo == null || !torrentInfo.isValid()) {
            return completedFiles;
        }

        FileStorage storage = torrentInfo.files();
        for (int index = 0; index < storage.numFiles(); index += 1) {
            String relativePath = storage.filePath(index);
            JSObject file = new JSObject();
            file.put("name", relativePath);
            file.put("path", new File(handle.savePath(), relativePath).getAbsolutePath());
            file.put("size", storage.fileSize(index));
            completedFiles.put(file);
        }

        return completedFiles;
    }

    private static final class NativeTorrentJob {
        private final String id;
        private Sha1Hash infoHash;
        private TorrentHandle handle;
        private boolean discoveryKicked;
        private String status = "queued";

        private NativeTorrentJob(String id) {
            this.id = id;
        }

        private TorrentHandle handle() {
            return handle;
        }
    }
}
