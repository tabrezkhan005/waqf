import React from 'react';
import {
  Platform,
  ScrollView,
  ScrollViewProps,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  backgroundColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
  safeAreaEdges?: SafeAreaViewProps['edges'];
};

export function Screen({
  children,
  style,
  contentStyle,
  scroll,
  scrollProps,
  backgroundColor = theme.colors.bg,
  statusBarStyle = 'dark-content',
  safeAreaEdges = ['top', 'left', 'right'],
}: Props) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor }, style]} edges={safeAreaEdges}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={Platform.OS === 'android'}
      />
      {scroll ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
