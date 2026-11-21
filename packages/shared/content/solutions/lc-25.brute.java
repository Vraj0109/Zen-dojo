import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Solution {
    public ListNode reverseKGroup(ListNode head, int k) {
        List<Integer> vals = new ArrayList<>();
        ListNode curr = head;
        while (curr != null) {
            vals.add(curr.val);
            curr = curr.next;
        }
        int n = vals.size();
        for (int i = 0; i + k <= n; i += k) {
            Collections.reverse(vals.subList(i, i + k));
        }
        curr = head;
        for (int v : vals) {
            curr.val = v;
            curr = curr.next;
        }
        return head;
    }
}
