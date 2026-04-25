import { useMutation } from '@tanstack/react-query'
import { invokeFunction, type InvokeResult } from './invokeClient'

/**
 * Mutation — POST /2015-03-31/functions/{name}/invocations (Invoke).
 *
 * [Pitfall 6] Invoke is INTENTIONALLY cache-neutral — it does not mutate
 * any backend state we cache (configuration, tags, ESMs, URL configs).
 * There is no `onSuccess` invalidation. The result lives in
 * `mutation.data` (ephemeral, component-local) and never in a query cache.
 *
 * [Pitfall 2] A function error is surfaced as `mutation.data.functionError`,
 * not as a thrown error — `invokeFunction` never throws on the
 * function-error path.
 *
 * [LAM-02]
 */
export function useInvoke(name: string) {
  return useMutation<InvokeResult, Error, unknown>({
    mutationFn: (payload) => invokeFunction(name, payload),
    // No onSuccess, no onSettled. Intentional — see Pitfall 6 above.
  })
}
