FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libsqlite3-dev \
    openjdk-17-jdk \
    ruby-full \
    sqlite3 \
    unzip \
    zip \
  && rm -rf /var/lib/apt/lists/*

RUN gem install bundler --no-document

RUN mkdir -p "${ANDROID_HOME}/cmdline-tools" \
  && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/android-commandline-tools.zip \
  && unzip -q /tmp/android-commandline-tools.zip -d /tmp/android-commandline-tools \
  && mv /tmp/android-commandline-tools/cmdline-tools "${ANDROID_HOME}/cmdline-tools/latest" \
  && rm -rf /tmp/android-commandline-tools /tmp/android-commandline-tools.zip

RUN yes | sdkmanager --licenses >/dev/null \
  && sdkmanager \
    "build-tools;35.0.0" \
    "platform-tools" \
    "platforms;android-35"
