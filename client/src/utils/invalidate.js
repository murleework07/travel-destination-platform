// After a review changes, everything showing ratings must refetch
export function invalidateDestination(queryClient, slug) {
  for (const key of [
    ['reviews', slug],
    ['rating-summary', slug],
    ['destination', slug],
    ['explore'],
    ['destinations'],
  ]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

// After an admin changes a destination, refresh every view that shows destinations
export function invalidateDestinations(queryClient, slug) {
  for (const key of [
    ['admin-destinations'],
    ['explore'],
    ['destinations'],
    ['filters'],
    ...(slug ? [['destination', slug]] : []),
  ]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
