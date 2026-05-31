const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: '런마켓',
    slug: 'runmarket-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'runmarket',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'cc.runmarket.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: '러닝 중 현재 위치를 실시간으로 공유하기 위해 위치 권한이 필요합니다.',
        NSLocationAlwaysAndWhenInUseUsageDescription: '러닝 중 백그라운드에서도 위치를 공유하기 위해 위치 권한이 필요합니다.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
        backgroundColor: '#232f3e',
      },
      package: 'cc.runmarket.app',
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      ['react-native-maps', { androidGoogleMapsApiKey: GOOGLE_MAPS_API_KEY }],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: '러닝 중 위치를 공유하기 위해 위치 권한이 필요합니다.',
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: '1fabb4fc-cbc9-461f-a5e2-af2b52418c80',
      },
    },
    owner: 'feelsgoodfrog',
  },
};
