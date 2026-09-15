import type {
  FreeTransportRow,
  ProductRatingRow,
  RejectionReportRow,
  ReportDateFilter,
} from '../types';
import { mockRequest } from './client';

const rejectionData: RejectionReportRow[] = [
  { date: '2026-09-12', rejectionCount: 3 },
  { date: '2026-09-13', rejectionCount: 5 },
  { date: '2026-09-14', rejectionCount: 2 },
  { date: '2026-09-15', rejectionCount: 4 },
];

const productRatingData: ProductRatingRow[] = [
  { rank: 1, name: 'Круассан с кремом', orderCount: 542 },
  { rank: 2, name: 'Торт «Прага»', orderCount: 380 },
  { rank: 3, name: 'Булочка с маком', orderCount: 315 },
  { rank: 4, name: 'Пирожное «Картошка»', orderCount: 290 },
  { rank: 5, name: 'Рулет швейцарский', orderCount: 110 },
];

const freeTransportData: FreeTransportRow[] = [
  {
    driver: 'Иванов П.С.',
    vehicle: 'КАМАЗ',
    licensePlate: 'А123БВ',
    city: 'Москва',
    availableSince: '26.05.2026, 09:15',
  },
  {
    driver: 'Сидоров А.В.',
    vehicle: 'МАЗ',
    licensePlate: 'В456ГД',
    city: 'Тверь',
    availableSince: '26.05.2026, 11:40',
  },
  {
    driver: 'Новиков Д.А.',
    vehicle: 'Scania R',
    licensePlate: 'К012ЛМ',
    city: 'Казань',
    availableSince: '25.05.2026, 18:05',
  },
];

export async function fetchRejectionReport(
  _filter: ReportDateFilter,
): Promise<RejectionReportRow[]> {
  return mockRequest([...rejectionData]);
}

export async function fetchProductRatingReport(
  _filter: ReportDateFilter,
): Promise<ProductRatingRow[]> {
  return mockRequest([...productRatingData]);
}

export async function fetchFreeTransportReport(
  _filter: ReportDateFilter,
): Promise<FreeTransportRow[]> {
  return mockRequest([...freeTransportData]);
}
