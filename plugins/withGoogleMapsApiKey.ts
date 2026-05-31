import { withAndroidManifest, ConfigPlugin } from '@expo/config-plugins';
import {
  addMetaDataItemToMainApplication,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from '@expo/config-plugins/build/android/Manifest';

const META_KEY = 'com.google.android.geo.API_KEY';

const withGoogleMapsApiKey: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const mainApplication = getMainApplicationOrThrow(config.modResults);

    if (!apiKey) {
      // 키가 없으면 제거만 하고 경고 (빌드는 계속)
      removeMetaDataItemFromMainApplication(mainApplication, META_KEY);
      console.warn(
        '\n⚠️  [withGoogleMapsApiKey] GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.\n' +
          '   로컬: .env.local 파일에 GOOGLE_MAPS_API_KEY=your_key 를 추가하세요.\n' +
          '   EAS:  eas env:create --environment development --name GOOGLE_MAPS_API_KEY\n'
      );
      return config;
    }

    removeMetaDataItemFromMainApplication(mainApplication, META_KEY);
    addMetaDataItemToMainApplication(mainApplication, META_KEY, apiKey);
    console.log(`✓ [withGoogleMapsApiKey] API 키 주입 완료 (length: ${apiKey.length})`);

    return config;
  });
};

export default withGoogleMapsApiKey;
