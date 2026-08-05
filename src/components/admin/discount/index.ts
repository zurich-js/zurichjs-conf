export { DiscountConfigTab } from './DiscountConfigTab';
export { CorporateAccessSection } from './CorporateAccessSection';
export {
  useDiscountConfig,
  useUpdateDiscountConfig,
  useCreateCorporateLink,
} from './hooks';
export {
  fetchDiscountConfigApi,
  updateDiscountConfigApi,
  createCorporateLinkApi,
  discountAdminQueryKeys,
} from './api';
export type {
  DiscountConfigRow,
  DiscountConfigUpdateInput,
  CorporateLinkInput,
  CorporateLinkResponse,
} from './types';
