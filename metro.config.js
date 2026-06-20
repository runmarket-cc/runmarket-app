// Expo 기본 Metro 설정을 Sentry로 감싼다.
// getSentryExpoConfig는 getDefaultConfig 위에 소스맵 생성 설정을 더해,
// EAS Update 배포분의 스택트레이스도 Sentry에서 원본 코드로 보이게 한다.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
