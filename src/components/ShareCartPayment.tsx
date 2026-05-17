import { useState } from 'react';
import { Share2, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCart, CartItem } from '@/contexts/CartContext';

interface Props {
  subtotal: number;
  total: number;
}

const ShareCartPayment = ({ subtotal, total }: Props) => {
  const { cartItems } = useCart();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [notes, setNotes] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (cartItems.length === 0) {
      toast({ title: 'Your cart is empty', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const snapshot: Pick<CartItem, 'id' | 'name' | 'price' | 'quantity' | 'image' | 'category'>[] =
        cartItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
          category: i.category,
        }));
      const { data, error } = await supabase
        .from('shared_payments')
        .insert({
          cart: snapshot,
          sender_name: senderName || null,
          notes: notes || null,
          subtotal,
          total,
        })
        .select('id')
        .single();
      if (error || !data) throw error || new Error('Failed to create link');
      const url = `${window.location.origin}/pay/${data.id}`;
      setShareUrl(url);
      // Try native share
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Nawa Cafe — Pay for my order',
            text: senderName
              ? `${senderName} would like you to pay for their Nawa Cafe order (AED ${total.toFixed(2)}).`
              : `Please pay for this Nawa Cafe order (AED ${total.toFixed(2)}).`,
            url,
          });
        } catch {
          /* user dismissed share sheet — link is still shown */
        }
      }
    } catch (e: any) {
      toast({
        title: 'Could not create share link',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const reset = () => {
    setShareUrl('');
    setSenderName('');
    setNotes('');
    setCopied(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="w-full mt-3 border-coffee-600 text-coffee-700 hover:bg-coffee-50"
          disabled={cartItems.length === 0}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Payment Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share payment link</DialogTitle>
          <DialogDescription>
            Generate a link so someone else can pay for these items directly.
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sender-name">Your name (optional)</Label>
              <Input
                id="sender-name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Ahmad"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="share-notes">Note for the payer (optional)</Label>
              <Textarea
                id="share-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thanks for getting this!"
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="rounded-md bg-cream-100 p-3 text-sm text-coffee-700">
              {cartItems.length} item{cartItems.length === 1 ? '' : 's'} • Total{' '}
              <span className="font-semibold">AED {total.toFixed(2)}</span>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-coffee-600 hover:bg-coffee-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" /> Generate link
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-coffee-700">
              Share this link — the recipient can pay directly without an account. The link expires
              in 14 days.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} className="font-mono text-xs" />
              <Button onClick={handleCopy} variant="outline" size="icon">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareCartPayment;
