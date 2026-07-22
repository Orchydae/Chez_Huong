import { useState, type SubmitEvent } from 'react';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useAddComment,
  useCommentReplies,
  useComments,
  useDeleteComment,
  useEditComment,
  useReplyToComment,
} from '../../api/social.api';
import type { Comment } from '../../api/types';
import { useAuth } from '../../api/auth.api';
import { toast } from '../../lib/toast';
import { useApiErrorToast } from '../../lib/apiError';
import { formatDate } from '../../lib/format';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import Spinner from '../ui/Spinner';

// text-base below sm so iOS Safari doesn't auto-zoom on focus; sm:text-sm keeps desktop.
const textareaClass =
  'w-full rounded-lg border border-forest/20 bg-white px-3.5 py-2.5 text-base text-forest outline-none transition focus:border-forest focus:ring-2 focus:ring-leaf/50 sm:text-sm';

/** Total of the loaded conversation — deeper replies count once expanded. */
function countAll(comments: Comment[]): number {
  return comments.reduce((sum, c) => sum + 1 + countAll(c.replies ?? []), 0);
}

/**
 * updatedAt always exists; it equals createdAt at creation (give or take write
 * jitter) and jumps ahead once the author edits. A 1s threshold tells the two
 * apart without a server flag.
 */
function wasEdited(c: Comment): boolean {
  return new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 1000;
}

/**
 * Comments with replies to any depth: the server returns two levels per fetch
 * and the rest load on demand ("load more replies", M5). Create / reply /
 * edit-own / delete-own.
 */
export default function CommentThread({ recipeId }: { recipeId: number }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: comments, isPending, isError } = useComments(recipeId);
  const addComment = useAddComment(recipeId);
  const deleteComment = useDeleteComment(recipeId);

  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState<Comment | null>(null);

  // 403 (someone else's comment) / 0 (network) / generic all come from the
  // shared defaults — no domain rows to add.
  const reportError = useApiErrorToast();

  // Sent raw — the server trims and rejects empty content (its DTO is the
  // single source of truth; native `required` is the only client-side gate).
  const submitComment = async (e: SubmitEvent) => {
    e.preventDefault();
    if (addComment.isPending) return;
    try {
      await addComment.mutateAsync(draft);
      setDraft('');
    } catch (err) {
      reportError(err);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleteComment.isPending) return;
    try {
      await deleteComment.mutateAsync(toDelete.id);
      toast.success(t('social.commentDeleted'));
      setToDelete(null);
    } catch (err) {
      reportError(err);
    }
  };

  return (
    <section aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="mb-6 flex items-center gap-3 text-3xl">
        <MessageCircle size={26} aria-hidden className="text-forest/40" />
        {t('social.comments')}
        {comments && (
          <span className="rounded-full bg-forest/10 px-3 py-1 text-sm font-medium text-forest/70">
            {countAll(comments)}
          </span>
        )}
      </h2>

      {user ? (
        <form className="mb-8 flex flex-col gap-3" onSubmit={e => void submitComment(e)}>
          <label htmlFor="new-comment" className="sr-only">
            {t('social.commentPlaceholder')}
          </label>
          <textarea
            id="new-comment"
            className={textareaClass}
            rows={3}
            required
            maxLength={1000}
            placeholder={t('social.commentPlaceholder')}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <Button type="submit" className="self-end" disabled={addComment.isPending}>
            {addComment.isPending && <Spinner size={16} />}
            {t('social.submitComment')}
          </Button>
        </form>
      ) : (
        <p className="mb-8 text-sm text-forest/60">{t('social.loginToComment')}</p>
      )}

      {isPending && (
        <div className="flex justify-center py-8">
          <Spinner size={24} />
        </div>
      )}

      {isError && <p className="py-4 text-coral">{t('social.error')}</p>}

      {comments && comments.length === 0 && (
        <p className="py-4 text-sm text-forest/60">{t('social.empty')}</p>
      )}

      {comments && comments.length > 0 && (
        <ul className="flex flex-col gap-6">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              recipeId={recipeId}
              depth={0}
              onDelete={setToDelete}
              onError={reportError}
            />
          ))}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          title={t('social.deleteCommentTitle')}
          message={t('social.deleteCommentMessage')}
          confirmLabel={t('social.deleteComment')}
          busy={deleteComment.isPending}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  );
}

interface CommentItemProps {
  comment: Comment;
  recipeId: number;
  depth: number;
  onDelete: (comment: Comment) => void;
  onError: (err: unknown) => void;
}

function CommentItem({ comment, recipeId, depth, onDelete, onError }: CommentItemProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const replyToComment = useReplyToComment(recipeId);
  const editComment = useEditComment(recipeId);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.content);
  // deeper replies are fetched only once the reader asks (boundary comments)
  const [expanded, setExpanded] = useState(false);

  const isOwn = user?.userId === comment.userId;
  const canReply = Boolean(user);

  // `replies` present → we're inside the server's two-level window; absent with
  // a positive count → a boundary whose children load on demand.
  const inlineReplies = comment.replies;
  const hasHiddenReplies = inlineReplies === undefined && comment._count.replies > 0;
  const repliesQuery = useCommentReplies(comment.id, hasHiddenReplies && expanded);
  const childComments = inlineReplies ?? (expanded ? repliesQuery.data : undefined);

  // Raw content, server-trimmed — same single-source-of-truth rule as above.
  const submitReply = async (e: SubmitEvent) => {
    e.preventDefault();
    if (replyToComment.isPending) return;
    try {
      await replyToComment.mutateAsync({ commentId: comment.id, content: replyDraft });
      setReplyDraft('');
      setReplyOpen(false);
      // a reply to a boundary comment lands in its (unloaded) subtree — open it
      // so the author sees their reply instead of just a "load more" count bump
      if (hasHiddenReplies) setExpanded(true);
    } catch (err) {
      onError(err);
    }
  };

  const submitEdit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (editComment.isPending) return;
    try {
      await editComment.mutateAsync({ commentId: comment.id, content: editDraft });
      setEditOpen(false);
    } catch (err) {
      onError(err);
    }
  };

  // Cap the compounding left-margin so deep threads stay readable on mobile;
  // past a few levels the thin rule alone signals nesting.
  const replyIndent =
    depth < 3 ? 'ml-6 border-l-2 border-forest/10 pl-4 sm:ml-10' : 'border-l-2 border-forest/10 pl-3';

  return (
    <li>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-semibold">
            {comment.user.firstName} {comment.user.lastName}
          </span>
          <span className="text-xs text-forest/50">
            {formatDate(comment.createdAt, i18n.language)}
            {wasEdited(comment) && <span className="ml-1 italic">· {t('social.edited')}</span>}
          </span>
        </div>

        {editOpen ? (
          <form className="mt-1 flex flex-col gap-2" onSubmit={e => void submitEdit(e)}>
            <label htmlFor={`edit-${comment.id}`} className="sr-only">
              {t('social.editComment')}
            </label>
            <textarea
              id={`edit-${comment.id}`}
              className={textareaClass}
              rows={3}
              required
              maxLength={1000}
              value={editDraft}
              onChange={e => setEditDraft(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setEditOpen(false);
                  setEditDraft(comment.content);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={editComment.isPending}>
                {editComment.isPending && <Spinner size={16} />}
                {t('social.saveEdit')}
              </Button>
            </div>
          </form>
        ) : (
          /* break-words contains 1000-char unbroken tokens inside the card;
             collapsing 3+ newlines to 2 neuters vertical spam — display
             normalization, not validation */
          <p className="text-sm leading-relaxed break-words whitespace-pre-line">
            {comment.content.replace(/\n{3,}/g, '\n\n')}
          </p>
        )}

        {!editOpen && (canReply || isOwn) && (
          <div className="mt-2 flex items-center gap-4 text-xs">
            {canReply && (
              <button
                type="button"
                className="font-medium text-forest/60 underline-offset-2 hover:underline"
                onClick={() => setReplyOpen(prev => !prev)}
              >
                {t('social.reply')}
              </button>
            )}
            {isOwn && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1 font-medium text-forest/60 underline-offset-2 hover:underline"
                  onClick={() => {
                    setEditDraft(comment.content);
                    setEditOpen(true);
                  }}
                >
                  <Pencil size={12} aria-hidden />
                  {t('social.editComment')}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 font-medium text-coral/80 underline-offset-2 hover:underline"
                  onClick={() => onDelete(comment)}
                >
                  <Trash2 size={12} aria-hidden />
                  {t('social.deleteComment')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {replyOpen && (
        <form className="mt-3 ml-6 flex flex-col gap-2 sm:ml-10" onSubmit={e => void submitReply(e)}>
          <label htmlFor={`reply-${comment.id}`} className="sr-only">
            {t('social.replyPlaceholder')}
          </label>
          <textarea
            id={`reply-${comment.id}`}
            className={textareaClass}
            rows={2}
            required
            maxLength={1000}
            placeholder={t('social.replyPlaceholder')}
            value={replyDraft}
            onChange={e => setReplyDraft(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setReplyOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={replyToComment.isPending}>
              {replyToComment.isPending && <Spinner size={16} />}
              {t('social.submitReply')}
            </Button>
          </div>
        </form>
      )}

      {childComments && childComments.length > 0 && (
        <ul className={`mt-3 flex flex-col gap-3 ${replyIndent}`}>
          {childComments.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              recipeId={recipeId}
              depth={depth + 1}
              onDelete={onDelete}
              onError={onError}
            />
          ))}
        </ul>
      )}

      {/* boundary comment with replies not yet loaded — fetch them on demand */}
      {hasHiddenReplies && !expanded && (
        <button
          type="button"
          className="mt-3 ml-6 text-xs font-medium text-leaf underline-offset-2 hover:underline sm:ml-10"
          onClick={() => setExpanded(true)}
        >
          {t('social.loadReplies', { count: comment._count.replies })}
        </button>
      )}

      {hasHiddenReplies && expanded && repliesQuery.isPending && (
        <div className="mt-3 ml-6 sm:ml-10">
          <Spinner size={16} />
        </div>
      )}

      {hasHiddenReplies && expanded && repliesQuery.isError && (
        <p className="mt-3 ml-6 text-xs text-coral sm:ml-10">{t('social.error')}</p>
      )}
    </li>
  );
}
