import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { hexToRgb, theme } from '@/lib/theme';

const screenWidth = Dimensions.get('window').width - 48;

interface AnimatedChartProps {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: any;
  color?: string;
  height?: number;
}

export default function AnimatedChart({
  type,
  title,
  data,
  color = theme.colors.primary,
  height = 220,
}: AnimatedChartProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      const rgb = hexToRgb(color) || hexToRgb(theme.colors.primary);
      if (!rgb) return `rgba(10, 126, 67, ${opacity})`;
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    },
    labelColor: (opacity = 1) => {
      const rgb = hexToRgb(theme.colors.muted);
      if (!rgb) return `rgba(100, 116, 139, ${opacity})`;
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    },
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.border,
      strokeWidth: 1,
    },
  };

  const renderChart = () => {
    try {
      // Validate and render line chart
      if (
        type === 'line' &&
        data &&
        data.labels &&
        Array.isArray(data.labels) &&
        data.datasets &&
        Array.isArray(data.datasets) &&
        data.datasets.length > 0
      ) {
        const chartData = {
          labels: data.labels,
          datasets: data.datasets
            .filter((ds: any) => ds && Array.isArray(ds.data))
            .map((ds: any) => ({
              ...ds,
              data: ds.data.map((val: any) => Math.max(0, Math.round(Number(val) || 0))),
            })),
          legend: data.legend,
        };

        // Ensure we have valid data
        if (chartData.datasets.length > 0 && chartData.labels.length > 0) {
          return (
            <LineChart
              data={chartData}
              width={screenWidth}
              height={height}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={false}
              segments={4}
            />
          );
        }
      }

      // Validate and render bar chart
      if (
        type === 'bar' &&
        data &&
        data.labels &&
        Array.isArray(data.labels) &&
        data.datasets &&
        Array.isArray(data.datasets) &&
        data.datasets[0] &&
        Array.isArray(data.datasets[0].data)
      ) {
        const chartData = {
          labels: data.labels,
          datasets: [
            {
              data: data.datasets[0].data.map((val: any) => Math.max(0, Math.round(Number(val) || 0))),
            },
          ],
        };

        // Ensure we have valid data
        if (chartData.datasets[0].data.length > 0 && chartData.labels.length > 0) {
          return (
            <BarChart
              data={chartData}
              width={screenWidth}
              height={height}
              chartConfig={chartConfig}
              style={styles.chart}
              withInnerLines={true}
              showValuesOnTopOfBars={true}
              fromZero={true}
              segments={4}
            />
          );
        }
      }

      // Validate and render pie chart
      if (type === 'pie' && Array.isArray(data) && data.length > 0) {
        // Ensure all pie chart data has required fields
        const validPieData = data.filter((item: any) => item && item.name && typeof item.population === 'number');
        if (validPieData.length > 0) {
          return (
            <PieChart
              data={validPieData}
              width={screenWidth}
              height={height}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
          );
        }
      }
    } catch (error) {
      console.error('Error rendering chart:', error);
    }

    // Fallback: Show a message but don't show placeholder text
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No chart data available</Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.chartCard}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {renderChart()}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
});
