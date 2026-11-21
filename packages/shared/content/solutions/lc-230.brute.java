import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Solution {
    private void collect(TreeNode root, List<Integer> vals) {
        if (root == null) return;
        vals.add(root.val);
        collect(root.left, vals);
        collect(root.right, vals);
    }

    public int kthSmallest(TreeNode root, int k) {
        List<Integer> vals = new ArrayList<>();
        collect(root, vals);
        Collections.sort(vals);
        return vals.get(k - 1);
    }
}
