import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { reviewsApi } from '../api/reviews.js';
import { getErrorMessage } from '../api/client.js';
import { invalidateDestination } from '../utils/invalidate.js';

export default function ReviewForm({ destinationId, slug }) {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      reviewsApi.create(destinationId, {
        rating,
        ...(comment.trim() && { comment: comment.trim() }),
      }),
    onSuccess: () => {
      toast.success('Thanks for your review!');
      setRating(0);
      setComment('');
      invalidateDestination(queryClient, slug);
    },
    onError: (err) => toast.error(getErrorMessage(err)), // e.g. 409 "already reviewed"
  });

  if (!user) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <Link to="/login" state={{ from: location }} className="font-medium text-teal-700">
          Log in
        </Link>{' '}
        to write a review.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-3 rounded-xl bg-slate-50 p-4"
    >
      <p className="text-sm font-medium">Your rating</p>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            className={`text-3xl transition ${
              star <= (hover || rating) ? 'text-amber-500' : 'text-slate-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Share your experience (optional)"
        className="input"
      />

      <button type="submit" disabled={!rating || mutation.isPending} className="btn-primary">
        {mutation.isPending ? 'Posting...' : 'Post review'}
      </button>
    </form>
  );
}
