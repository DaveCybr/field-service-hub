import { useNavigate, useLocation } from "react-router-dom";

/**
 * Custom navigation hook that preserves query parameters
 * Use this instead of useNavigate() to keep filters when navigating
 */
export function useNavigateWithParams() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateWithParams = (to: string, options?: { replace?: boolean }) => {
    // Get current query params
    const currentParams = new URLSearchParams(location.search);
    const paramsString = currentParams.toString();

    // Append params to destination URL
    const destination = paramsString ? `${to}?${paramsString}` : to;

    navigate(destination, options);
  };

  const goBack = () => {
    navigate(-1);
  };

  return { navigate: navigateWithParams, goBack };
}

/**
 * Get filter params from URL to display in breadcrumb or back button
 */
export function useFilterParams() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const hasFilters = params.toString().length > 0;

  const filterSummary = {
    search: params.get("search") || undefined,
    status: params.get("status") || undefined,
    payment: params.get("payment") || undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
  };

  const filterCount = Object.values(filterSummary).filter(Boolean).length;

  return {
    hasFilters,
    filterCount,
    filterSummary,
    paramsString: params.toString(),
  };
}
