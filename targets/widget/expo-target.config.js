/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'RunmarketWidget',
  displayName: 'RunmarketWidget',
  // Live Activity 모듈(modules/runmarket-live-activity)과 동일한 최소 지원 버전 유지
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
};
