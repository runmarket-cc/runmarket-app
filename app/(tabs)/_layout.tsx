import { Tabs } from 'expo-router';
import { RunTabBar } from '../../src/components/RunTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <RunTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: '대회 정보' }} />
      <Tabs.Screen name="mypage" options={{ title: '마이페이지' }} />
    </Tabs>
  );
}
