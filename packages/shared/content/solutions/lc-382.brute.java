import java.util.*;

class Solution {
    private final List<Integer> vals = new ArrayList<>();
    private final Random rand = new Random();

    public Solution(ListNode head) {
        ListNode cur = head;
        while (cur != null) {
            vals.add(cur.val);
            cur = cur.next;
        }
    }

    public int getRandom() {
        return vals.get(rand.nextInt(vals.size()));
    }
}
