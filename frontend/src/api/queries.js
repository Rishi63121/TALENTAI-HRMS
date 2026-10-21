/**
 * Every call to the backend goes through the hooks in this file, so loading, caching,
 * retries, toasts and cache-refresh-after-change behave identically on every page.
 *
 * Reading:   const q = useEmployees();            -> pass `q` to <QueryBoundary query={q}>
 * Changing:  const m = useCreateEmployee();       -> m.mutate(payload, { onSuccess })  /  m.mutateAsync(payload)
 *            m.isPending drives button spinners; m.error holds the normalized error for inline form messages.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { AI_TIMEOUT } from './axios';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../lib/errors';

const get = (url, params) => api.get(url, { params }).then((r) => r.data);

export const keys = {
  overview: ['overview'],
  employees: ['employees'],
  me: ['employees', 'me'],
  attendance: ['attendance'],
  myAttendance: ['attendance', 'my'],
  payroll: ['payroll'],
  myPayroll: ['payroll', 'my'],
  reviews: ['performance'],
  myReviews: ['performance', 'my'],
  recruiters: ['recruiters'],
  jobs: ['jobs'],
  candidates: ['candidates'],
  candidate: (id) => ['candidates', id],
  rankings: (jobId) => ['rankings', jobId ?? 'all'],
  interviews: (id) => ['interview', id],
  onboarding: ['onboarding'],
  emailStatus: ['emails', 'status'],
};

/* ------------------------------------------------------------------ helper */

function useApiMutation(mutationFn, { invalidate = [], success, errorTitle, toastError = true, onSuccess } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      invalidate.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      if (success) toast.success(typeof success === 'function' ? success(data, variables) : success);
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (toastError) toast.error(errorMessage(error), errorTitle);
    },
  });
}

/* --------------------------------------------------------------- dashboards */

export const useOverview = (options) => useQuery({ queryKey: keys.overview, queryFn: () => get('/dashboard/overview'), ...options });

/* ---------------------------------------------------------------- employees */

export const useEmployees = (options) => useQuery({ queryKey: keys.employees, queryFn: () => get('/employees'), ...options });
export const useMyProfile = (options) => useQuery({ queryKey: keys.me, queryFn: () => get('/employees/me'), ...options });

export const useCreateEmployee = (opts) =>
  useApiMutation((payload) => api.post('/employees', payload).then((r) => r.data), {
    invalidate: [keys.employees, keys.overview],
    errorTitle: "Couldn't add employee",
    ...opts,
  });

export const useUpdateEmployee = (opts) =>
  useApiMutation(({ id, ...payload }) => api.put(`/employees/${id}`, payload).then((r) => r.data), {
    invalidate: [keys.employees, keys.overview],
    success: 'Employee updated',
    errorTitle: "Couldn't update employee",
    ...opts,
  });

export const useDeleteEmployee = (opts) =>
  useApiMutation((id) => api.delete(`/employees/${id}`).then((r) => r.data), {
    invalidate: [keys.employees, keys.attendance, keys.payroll, keys.reviews, keys.overview],
    success: 'Employee removed',
    errorTitle: "Couldn't remove employee",
    ...opts,
  });

/* --------------------------------------------------------------- attendance */

export const useAttendance = (params, options) =>
  useQuery({ queryKey: [...keys.attendance, params ?? {}], queryFn: () => get('/attendance', params), ...options });
export const useMyAttendance = (options) => useQuery({ queryKey: keys.myAttendance, queryFn: () => get('/attendance/my'), ...options });

export const useMarkAttendance = (opts) =>
  useApiMutation((payload) => api.post('/attendance', payload).then((r) => r.data), {
    invalidate: [keys.attendance, keys.overview],
    success: 'Attendance saved',
    errorTitle: "Couldn't save attendance",
    ...opts,
  });

export const useCheckIn = (opts) =>
  useApiMutation((status = 'Present') => api.post('/attendance/check-in', { status }).then((r) => r.data), {
    invalidate: [keys.myAttendance, keys.overview],
    success: (_, status) => (status === 'WFH' ? "Checked in - working from home today" : "You're checked in. Have a great day!"),
    errorTitle: "Couldn't check in",
    ...opts,
  });

/* ------------------------------------------------------------------ payroll */

export const usePayroll = (options) => useQuery({ queryKey: keys.payroll, queryFn: () => get('/payroll'), ...options });
export const useMyPayroll = (options) => useQuery({ queryKey: keys.myPayroll, queryFn: () => get('/payroll/my'), ...options });

export const useCreatePayroll = (opts) =>
  useApiMutation((payload) => api.post('/payroll', payload).then((r) => r.data), {
    invalidate: [keys.payroll, keys.overview],
    success: 'Payroll recorded',
    errorTitle: "Couldn't record payroll",
    ...opts,
  });

/* -------------------------------------------------------------- performance */

export const useReviews = (options) => useQuery({ queryKey: keys.reviews, queryFn: () => get('/performance'), ...options });
export const useMyReviews = (options) => useQuery({ queryKey: keys.myReviews, queryFn: () => get('/performance/my'), ...options });

export const useCreateReview = (opts) =>
  useApiMutation((payload) => api.post('/performance', payload).then((r) => r.data), {
    invalidate: [keys.reviews, keys.overview],
    success: 'Review added',
    errorTitle: "Couldn't add review",
    ...opts,
  });

export const useUpdateReview = (opts) =>
  useApiMutation(({ id, ...payload }) => api.put(`/performance/${id}`, payload).then((r) => r.data), {
    invalidate: [keys.reviews, keys.overview],
    success: 'Review updated',
    errorTitle: "Couldn't update review",
    ...opts,
  });

export const useDeleteReview = (opts) =>
  useApiMutation((id) => api.delete(`/performance/${id}`).then((r) => r.data), {
    invalidate: [keys.reviews, keys.overview],
    success: 'Review deleted',
    errorTitle: "Couldn't delete review",
    ...opts,
  });

/* --------------------------------------------------------------- recruiters */

export const useRecruiters = (options) => useQuery({ queryKey: keys.recruiters, queryFn: () => get('/recruiters'), ...options });

/* --------------------------------------------------------------------- jobs */

export const useJobs = (options) => useQuery({ queryKey: keys.jobs, queryFn: () => get('/jobs'), ...options });

export const useCreateJob = (opts) =>
  useApiMutation((payload) => api.post('/jobs', payload).then((r) => r.data), {
    invalidate: [keys.jobs, keys.overview],
    success: 'Job posted',
    errorTitle: "Couldn't create job",
    ...opts,
  });

export const useUpdateJob = (opts) =>
  useApiMutation(({ id, ...payload }) => api.put(`/jobs/${id}`, payload).then((r) => r.data), {
    invalidate: [keys.jobs, keys.overview],
    success: 'Job updated',
    errorTitle: "Couldn't update job",
    ...opts,
  });

export const useDeleteJob = (opts) =>
  useApiMutation((id) => api.delete(`/jobs/${id}`).then((r) => r.data), {
    invalidate: [keys.jobs, keys.candidates, ['rankings'], keys.overview],
    success: 'Job deleted',
    errorTitle: "Couldn't delete job",
    ...opts,
  });

/* --------------------------------------------------------------- candidates */

export const useCandidates = (options) => useQuery({ queryKey: keys.candidates, queryFn: () => get('/candidates'), ...options });
export const useCandidate = (id, options) =>
  useQuery({ queryKey: keys.candidate(id), queryFn: () => get(`/candidates/${id}`), enabled: Boolean(id), ...options });
export const useRankings = (jobId, options) =>
  useQuery({ queryKey: keys.rankings(jobId), queryFn: () => get('/candidates/rankings', jobId ? { job_id: jobId } : undefined), ...options });

export const useCreateCandidate = (opts) =>
  useApiMutation((payload) => api.post('/candidates', payload).then((r) => r.data), {
    invalidate: [keys.candidates, keys.overview],
    success: 'Candidate added',
    errorTitle: "Couldn't add candidate",
    ...opts,
  });

export const useDeleteCandidate = (opts) =>
  useApiMutation((id) => api.delete(`/candidates/${id}`).then((r) => r.data), {
    invalidate: [keys.candidates, ['rankings'], keys.onboarding, keys.overview],
    success: 'Candidate removed',
    errorTitle: "Couldn't remove candidate",
    ...opts,
  });

/** Upload a PDF resume. Pass { file, onProgress } - onProgress receives 0-100. */
export const useUploadResume = (opts) =>
  useApiMutation(
    ({ file, onProgress }) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post('/resumes/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60_000,
          onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
        })
        .then((r) => r.data);
    },
    { invalidate: [keys.candidates, keys.overview], errorTitle: "Couldn't upload resume", toastError: false, ...opts }
  );

/** Score a candidate against a job with the AI (can take a while). Pass { candidate_id, job_id }. */
export const useScreenCandidate = (opts) =>
  useApiMutation((payload) => api.post('/candidates/screen', payload, { timeout: AI_TIMEOUT }).then((r) => r.data), {
    invalidate: [keys.candidates, ['rankings'], keys.jobs, keys.overview],
    errorTitle: "Couldn't screen candidate",
    toastError: false,
    ...opts,
  });

/* ---------------------------------------------------------------- interview */

export const useInterviewHistory = (candidateId, options) =>
  useQuery({
    queryKey: keys.interviews(candidateId),
    queryFn: () => get(`/interview/${candidateId}/history`),
    enabled: Boolean(candidateId),
    ...options,
  });

export const useGenerateQuestions = (opts) =>
  useApiMutation(
    (candidateId) => api.post('/interview/questions', { candidate_id: candidateId }, { timeout: AI_TIMEOUT }).then((r) => r.data),
    {
      onSuccess: undefined,
      errorTitle: "Couldn't generate questions",
      toastError: false,
      ...opts,
    }
  );

/* --------------------------------------------------------------- onboarding */

export const useOnboarding = (options) => useQuery({ queryKey: keys.onboarding, queryFn: () => get('/onboarding'), ...options });

/** Whether candidate emails will actually go out (SMTP set up, automatic mode on). */
export const useEmailStatus = (options) =>
  useQuery({ queryKey: keys.emailStatus, queryFn: () => get('/emails/status'), staleTime: 60_000, ...options });

/** One short sentence about the candidate email the server just triggered, to append to a success toast. */
const emailNote = (email) => {
  if (!email) return '';
  return email.queued ? ' The candidate is being emailed.' : ` ${email.reason}`;
};

export const useStartOnboarding = (opts) =>
  useApiMutation(
    ({ candidateId, notify = true }) =>
      api.post('/onboarding/create', { candidate_id: candidateId }, { params: { notify } }).then((r) => r.data),
    {
    invalidate: [keys.onboarding, keys.candidates, keys.overview],
    success: (data) => `Onboarding started.${emailNote(data?.email)}`,
    errorTitle: "Couldn't start onboarding",
    ...opts,
    }
  );

export const useUpdateOnboardingStatus = (opts) =>
  useApiMutation(
    ({ candidate_id, status, notify = true }) =>
      api.patch(`/onboarding/${candidate_id}/status`, null, { params: { status, notify } }).then((r) => r.data),
    {
      invalidate: [keys.onboarding, keys.candidates, keys.overview],
      success: (data) => `Status updated.${emailNote(data?.email)}`,
      errorTitle: "Couldn't update status",
      ...opts,
    }
  );
