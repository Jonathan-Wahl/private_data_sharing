FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV PATH="${JAVA_HOME}/bin:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    default-mysql-client \
    git \
    gnupg \
    libsqlite3-dev \
    postgresql-client \
    redis-tools \
    ruby-full \
    sqlite3 \
    unzip \
    zip \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public \
    | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" \
    > /etc/apt/sources.list.d/adoptium.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends temurin-21-jdk \
  && rm -rf /var/lib/apt/lists/* \
  && java -version \
  && javac -version

RUN gem install bundler --no-document

RUN mkdir -p "${ANDROID_HOME}/cmdline-tools" \
  && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/android-commandline-tools.zip \
  && unzip -q /tmp/android-commandline-tools.zip -d /tmp/android-commandline-tools \
  && mv /tmp/android-commandline-tools/cmdline-tools "${ANDROID_HOME}/cmdline-tools/latest" \
  && rm -rf /tmp/android-commandline-tools /tmp/android-commandline-tools.zip

RUN yes | sdkmanager --licenses >/dev/null \
  && sdkmanager \
    "build-tools;35.0.0" \
    "build-tools;36.0.0" \
    "platform-tools" \
    "platforms;android-35" \
    "platforms;android-36"

COPY post-create.sh /usr/local/share/secure-share/post-create.sh
COPY wait-for-android.sh /usr/local/share/secure-share/wait-for-android.sh
COPY emulator-clipboard.sh /usr/local/bin/emulator-clipboard
RUN chmod +x \
    /usr/local/bin/emulator-clipboard \
    /usr/local/share/secure-share/post-create.sh \
    /usr/local/share/secure-share/wait-for-android.sh
