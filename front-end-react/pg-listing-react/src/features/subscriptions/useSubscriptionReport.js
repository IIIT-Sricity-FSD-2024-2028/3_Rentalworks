import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { fetchSubscriptionReport, selectSubscriptionReport } from './subscriptionReportSlice';

export default function useSubscriptionReport() {
  const dispatch = useDispatch();
  const report = useSelector(selectSubscriptionReport);

  useEffect(() => {
    dispatch(fetchSubscriptionReport());
  }, [dispatch]);
  useAutoRefresh(() => dispatch(fetchSubscriptionReport()));

  return report;
}
