import { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchDispatcherProductRatingReport,
  fetchDispatcherRejectionReport,
  fetchDispatcherRejectionsForDay,
} from '../src/api/dispatcherReports';
import { fetchFreeTransportReport } from '../src/api/reports';
import { Header } from '../src/components/Header/Header';
import { RejectionChart } from '../src/components/Dispatcher/RejectionChart';
import { Button, FieldLabel, Input, LoadingText, SectionTitle } from '../src/components/ui/Ui';
import { useAuth } from '../src/context/AuthContext';
import type {
  FreeTransportRow,
  ProductRatingRow,
  RejectionReportRow,
  RejectionDayDetails,
  ReportDateFilter,
} from '../src/types';
import { colors } from '../src/theme/colors';

type DispatcherReportTab = 'refusals' | 'rating';
type DispatcherRange = 'week' | 'month';

function dispatcherRangeFilter(range: DispatcherRange): ReportDateFilter {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (range === 'week' ? 6 : 29));
  const format = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return { dateFrom: format(from), dateTo: format(to) };
}

function completeDailyRows(rows: RejectionReportRow[], filter: ReportDateFilter): RejectionReportRow[] {
  const counts = new Map(rows.map(row => [row.date.slice(0, 10), row.rejectionCount]));
  const current = new Date(`${filter.dateFrom}T00:00:00`);
  const last = new Date(`${filter.dateTo}T00:00:00`);
  const result: RejectionReportRow[] = [];
  while (current <= last) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    result.push({ date, rejectionCount: counts.get(date) ?? 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, userRole } = useAuth();
  const isDispatcher = userRole === 'Dispatcher';

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [freeTransportRows, setFreeTransportRows] = useState<FreeTransportRow[]>([]);
  const [refusalRows, setRefusalRows] = useState<RejectionReportRow[]>([]);
  const [ratingRows, setRatingRows] = useState<ProductRatingRow[]>([]);
  const [dispatcherTab, setDispatcherTab] = useState<DispatcherReportTab>('refusals');
  const [dispatcherRange, setDispatcherRange] = useState<DispatcherRange>('week');
  const [selectedDate, setSelectedDate] = useState<string>();
  const [dayDetails, setDayDetails] = useState<RejectionDayDetails>();
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isDispatcher) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchFreeTransportReport({ dateFrom: '', dateTo: '' });
      if (!cancelled) {
        setFreeTransportRows(data);
        setGenerated(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isDispatcher]);

  useEffect(() => {
    if (!isAuthenticated || !isDispatcher) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const filter = dispatcherRangeFilter(dispatcherRange);
        if (dispatcherTab === 'refusals') {
          const rows = await fetchDispatcherRejectionReport(filter);
          if (!cancelled) {
            setRefusalRows(completeDailyRows(rows, filter));
            setSelectedDate(undefined);
            setDayDetails(undefined);
          }
        } else {
          const rows = await fetchDispatcherProductRatingReport(filter);
          if (!cancelled) setRatingRows(rows);
        }
        if (!cancelled) setGenerated(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, isDispatcher, dispatcherRange, dispatcherTab]);

  const handleGenerateCoordinator = async () => {
    const filter: ReportDateFilter = { dateFrom, dateTo };
    setLoading(true);
    try {
      setFreeTransportRows(await fetchFreeTransportReport(filter));
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setDetailsLoading(true);
    try {
      setDayDetails(await fetchDispatcherRejectionsForDay(date));
    } finally {
      setDetailsLoading(false);
    }
  };

  if (authLoading) return <LoadingText />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header variant="app" />

      <ScrollView style={styles.main} contentContainerStyle={styles.content}>
        {isDispatcher ? (
          <>
            <SectionTitle>Отчёты диспетчера</SectionTitle>
            <View style={styles.tabs}>
              <TabButton
                label="Статистика отказов"
                active={dispatcherTab === 'refusals'}
                onPress={() => {
                  setDispatcherTab('refusals');
                  setGenerated(false);
                }}
              />
              <TabButton
                label="Рейтинг продукции"
                active={dispatcherTab === 'rating'}
                onPress={() => {
                  setDispatcherTab('rating');
                  setGenerated(false);
                }}
              />
            </View>
            <View style={styles.rangeTabs}>
              <TabButton label="Неделя" active={dispatcherRange === 'week'} onPress={() => setDispatcherRange('week')} />
              <TabButton label="Месяц" active={dispatcherRange === 'month'} onPress={() => setDispatcherRange('month')} />
            </View>
          </>
        ) : (
          <SectionTitle>Анализ свободного транспорта</SectionTitle>
        )}

        {!isDispatcher ? <>
          <FieldLabel>Период с (YYYY-MM-DD):</FieldLabel>
          <Input value={dateFrom} onChangeText={setDateFrom} placeholder="2026-05-01" />
          <FieldLabel>по:</FieldLabel>
          <Input value={dateTo} onChangeText={setDateTo} placeholder="2026-05-28" />
          <Button title={loading ? 'Формирование...' : 'Сформировать'} onPress={handleGenerateCoordinator} loading={loading} style={styles.generateBtn} />
        </> : loading ? <LoadingText /> : null}

        {isDispatcher && generated && dispatcherTab === 'refusals'
          ? <>
              <View style={styles.chartCard}>
                <Text style={styles.cardTitleText}>Отказы по дням</Text>
                <RejectionChart rows={refusalRows} selectedDate={selectedDate} onSelect={handleSelectDate} />
              </View>
              {detailsLoading ? <LoadingText /> : dayDetails ? <View style={styles.tableCard}>
                <Text style={styles.cardTitleText}>Отказы за {selectedDate} ({dayDetails.total})</Text>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.timeCell]}>Дата и время</Text>
                  <Text style={[styles.tableCell, styles.reasonCell]}>Причина</Text>
                  <Text style={[styles.tableCell, styles.orderCell]}>Заказ</Text>
                </View>
                {dayDetails.items.map(item => <View key={item.orderId} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.timeCell]}>{new Date(item.rejectedAt).toLocaleString('ru-RU')}</Text>
                  <Text style={[styles.tableCell, styles.reasonCell]}>{item.reason}</Text>
                  <Pressable style={styles.orderCell} onPress={() => router.push(`/order/${item.orderId}` as never)}>
                    <Text style={styles.orderLink}>№ {item.orderNumber}</Text>
                  </Pressable>
                </View>)}
              </View> : null}
            </>
          : null}

        {isDispatcher && generated && dispatcherTab === 'rating'
          ? ratingRows.map((row) => (
              <View key={row.rank} style={styles.card}>
                <Text style={styles.cardTitleText}>
                  {row.rank}. {row.name}
                </Text>
                <Text style={styles.meta}>Заказов: {row.orderCount}</Text>
              </View>
            ))
          : null}

        {!isDispatcher && generated
          ? freeTransportRows.map((row) => (
              <View key={`${row.driver}-${row.licensePlate}`} style={styles.card}>
                <Text style={styles.cardTitleText}>{row.driver}</Text>
                <Text style={styles.meta}>
                  {row.vehicle} · {row.licensePlate}
                </Text>
                <Text style={styles.meta}>Город: {row.city}</Text>
                <Text style={styles.date}>Свободен с: {row.availableSince}</Text>
              </View>
            ))
          : null}

        {!generated && !loading && (
          <Text style={styles.hint}>Выберите период и нажмите «Сформировать»</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  generateBtn: {
    marginVertical: 16,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    gap: 8,
  },
  tableHeader: { backgroundColor: colors.background },
  tableCell: { fontSize: 12, color: colors.text },
  timeCell: { width: 150 },
  reasonCell: { flex: 1 },
  orderCell: { width: 90 },
  orderLink: { color: colors.primary, fontWeight: '700' },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },
  hint: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
