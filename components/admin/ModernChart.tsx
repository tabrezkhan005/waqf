import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart, ContributionGraph } from 'react-native-chart-kit';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;

interface ModernChartProps {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: any;
  height?: number;
  colors?: string[];
  delay?: number;
}

export default function ModernChart({
  type,
  title,
  data,
  height = 220,
  colors = ['#0A7E43', '#10B981', '#34D399'],
  delay = 0,
}: ModernChartProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 800 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(10, 126, 67, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(42, 42, 42, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#0A7E43',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1,
    },
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart
            data={data}
            width={screenWidth - 64}
            height={height}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withDots={true}
            withShadow={false}
            segments={4}
          />
        );
      case 'bar':
        return (
          <BarChart
            data={data}
            width={screenWidth - 64}
            height={height}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            withInnerLines={false}
            fromZero={true}
          />
        );
      case 'pie':
        return (
          <PieChart
            data={data}
            width={screenWidth - 64}
            height={height}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        );
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.chartContainer}>{renderChart()}</View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    borderRadius: 16,
  },
});
