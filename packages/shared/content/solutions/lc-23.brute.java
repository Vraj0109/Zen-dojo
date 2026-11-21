import java.util.*;

class Solution {
    public ListNode mergeKLists(int[][] lists) {
        List<Integer> vals = new ArrayList<>();
        for (int[] l : lists) {
            for (int x : l) vals.add(x);
        }
        Collections.sort(vals);
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int x : vals) {
            tail.next = new ListNode(x);
            tail = tail.next;
        }
        return dummy.next;
    }
}
