const { withAndroidManifest } = require('@expo/config-plugins');

// android.config.googleMaps 방식 대신 AndroidManifest.xml에 직접 주입
const withGoogleMapsApiKey = (config) => {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    app['meta-data'] = (app['meta-data'] || []).filter(
      (item) => item.$['android:name'] !== 'com.google.android.geo.API_KEY'
    );
    app['meta-data'].push({
      $: {
        'android:name': 'com.google.android.geo.API_KEY',
        'android:value': process.env.GOOGLE_MAPS_API_KEY || '',
      },
    });
    return config;
  });
};

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
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      withGoogleMapsApiKey,
      'expo-router',
      'expo-secure-store',
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
