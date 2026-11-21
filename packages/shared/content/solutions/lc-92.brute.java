import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        List<Integer> vals = new ArrayList<>();
        ListNode curr = head;
        while (curr != null) {
            vals.add(curr.val);
            curr = curr.next;
        }
        Collections.reverse(vals.subList(left - 1, right));
        curr = head;
        for (int v : vals) {
            curr.val = v;
            curr = curr.next;
        }
        return head;
    }
}
