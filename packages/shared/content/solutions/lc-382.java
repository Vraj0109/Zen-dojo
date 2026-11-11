import java.util.*;

class Solution {
    private final ListNode head;
    private final Random rand = new Random();

    public Solution(ListNode head) {
        this.head = head;
    }

    public int getRandom() {
        int ans = head.val;
        ListNode curr = head.next;
        int i = 2;
        while (curr != null) {
            if (rand.nextInt(i) == 0) ans = curr.val;
            curr = curr.next;
            i++;
        }
        return ans;
    }
}
