import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Edit3, Trash2, CheckCircle2, AlertCircle, LogIn, User } from 'lucide-react';
import { ReviewItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { subscribeApkReviews, addOrUpdateReview, deleteReview } from '../services/db';

interface ReviewSectionProps {
  apkId: string;
  apkName: string;
  currentRating?: number;
  reviewsCount?: number;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  apkId,
  apkName,
  currentRating = 4.8,
  reviewsCount = 0
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [myReview, setMyReview] = useState<ReviewItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Subscribe to reviews for this APK
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeApkReviews(apkId, (data) => {
      setReviews(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [apkId]);

  // Sync user's existing review if any
  useEffect(() => {
    if (user && reviews.length > 0) {
      const found = reviews.find(r => r.userId === user.uid);
      if (found) {
        setMyReview(found);
        if (!isEditing) {
          setRating(found.rating);
          setComment(found.comment || '');
        }
      } else {
        setMyReview(null);
      }
    } else {
      setMyReview(null);
    }
  }, [user, reviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      signInWithGoogle();
      return;
    }

    if (rating < 1 || rating > 5) {
      setFeedback({ type: 'error', text: 'Please select a rating between 1 and 5 stars.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await addOrUpdateReview({
        id: myReview?.id,
        apkId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        userPhotoURL: user.photoURL || '',
        rating,
        comment: comment.trim()
      });

      setFeedback({
        type: 'success',
        text: myReview ? 'Your review has been updated successfully!' : 'Thank you! Your review has been published.'
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setFeedback({ type: 'error', text: err?.message || 'Failed to submit review. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview || !window.confirm('Are you sure you want to delete your review?')) return;
    setSubmitting(true);
    try {
      await deleteReview(myReview.id, apkId);
      setMyReview(null);
      setRating(5);
      setComment('');
      setIsEditing(false);
      setFeedback({ type: 'success', text: 'Your review was deleted.' });
    } catch (err) {
      console.error('Failed to delete review:', err);
      setFeedback({ type: 'error', text: 'Failed to delete review.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
    : currentRating.toFixed(1);

  const starCounts = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: totalReviews > 0
      ? Math.round((reviews.filter(r => r.rating === stars).length / totalReviews) * 100)
      : 0
  }));

  const starLabels: Record<number, string> = {
    5: 'Excellent',
    4: 'Very Good',
    3: 'Good',
    2: 'Fair',
    1: 'Poor'
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h2 className="text-base sm:text-lg font-black text-white">Ratings & Reviews</h2>
        </div>
        <span className="text-xs font-semibold text-zinc-400 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
          {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
        </span>
      </div>

      {/* Ratings Summary Card & Star Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-zinc-950/80 border border-zinc-800/80 p-5 rounded-2xl items-center">
        {/* Left Column: Big Score */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-1.5 border-b md:border-b-0 md:border-r border-zinc-800/80 pb-4 md:pb-0 md:pr-4">
          <p className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">{averageRating}</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= Math.round(Number(averageRating))
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-zinc-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-400 font-medium pt-1">
            Based on <span className="text-zinc-200 font-bold">{totalReviews}</span> user ratings
          </p>
        </div>

        {/* Right Column: Rating Bars */}
        <div className="md:col-span-8 space-y-1.5">
          {starCounts.map(({ stars, count, percentage }) => (
            <div key={stars} className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 w-12 shrink-0 text-zinc-400 font-bold">
                <span>{stars}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              </div>
              <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-10 text-right text-zinc-500 text-[11px] font-mono">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review Form / Edit Section */}
      <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4">
        {!user ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                <MessageSquare className="w-4 h-4 text-amber-400" /> Have you tried {apkName}?
              </h3>
              <p className="text-xs text-zinc-400">Sign in with Google to post your 1-5 star rating & feedback.</p>
            </div>
            <button
              id="btn-signin-review"
              onClick={signInWithGoogle}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0"
            >
              <LogIn className="w-4 h-4" /> Sign In to Review
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {user.photoURL && user.photoURL.trim() !== '' ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full object-cover border border-amber-500/30" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                    {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-bold text-white">
                    {myReview && !isEditing ? 'Your Review' : 'Rate & Write a Review'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">{user.displayName || user.email}</p>
                </div>
              </div>

              {myReview && !isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Review
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    disabled={submitting}
                    className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>

            {/* If user already reviewed and is not editing, show their review card */}
            {myReview && !isEditing ? (
              <div className="bg-zinc-900/90 p-4 rounded-xl border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= myReview.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-400">{starLabels[myReview.rating]}</span>
                  <span className="text-[10px] text-zinc-500 ml-auto">
                    {new Date(myReview.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {myReview.comment ? (
                  <p className="text-xs text-zinc-200 whitespace-pre-line leading-relaxed">{myReview.comment}</p>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No comment provided.</p>
                )}
              </div>
            ) : (
              /* Editable Star Rating Picker & Comment Input */
              <div className="space-y-4 pt-1">
                {/* Star Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">Your Rating</label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const activeStars = hoverRating || rating;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= activeStars
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                  : 'text-zinc-700 hover:text-zinc-500'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-extrabold text-amber-400 ml-2">
                      {starLabels[hoverRating || rating]} ({hoverRating || rating}/5)
                    </span>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-zinc-300">Your Review / Feedback (Optional)</label>
                    <span className="text-[10px] text-zinc-500">{comment.length}/500</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={`Write your experience with ${apkName}...`}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 justify-end pt-1">
                  {myReview && isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs font-bold text-zinc-400 hover:text-white px-4 py-2 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? 'Publishing...' : myReview ? 'Update Review' : 'Submit Review'}
                  </button>
                </div>
              </div>
            )}

            {feedback && (
              <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{feedback.text}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* All User Reviews List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Customer Reviews</h3>

        {loading ? (
          <div className="text-xs text-zinc-500 py-6 text-center">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 bg-zinc-950/40 rounded-2xl border border-zinc-800/60 space-y-2">
            <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-semibold text-zinc-300">No reviews yet for {apkName}.</p>
            <p className="text-[11px] text-zinc-500">Be the first user to submit a rating and feedback above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const isMine = user && r.userId === user.uid;
              return (
                <div
                  key={r.id}
                  className={`p-4 rounded-2xl border transition space-y-2 ${
                    isMine
                      ? 'bg-zinc-900/90 border-amber-500/30'
                      : 'bg-zinc-950/70 border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {r.userPhotoURL && r.userPhotoURL.trim() !== '' ? (
                        <img src={r.userPhotoURL} alt={r.userName} className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-amber-400 flex items-center justify-center font-bold text-xs border border-zinc-700 shrink-0">
                          {r.userName?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{r.userName}</span>
                          {isMine && (
                            <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= r.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-mono">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {r.comment && (
                    <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed pl-10">
                      {r.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
