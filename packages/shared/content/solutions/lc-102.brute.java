import java.util.ArrayList;
import java.util.List;

class Solution {
    private int getHeight(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(getHeight(root.left), getHeight(root.right));
    }

    private void collectLevel(TreeNode root, int d, List<Integer> level) {
        if (root == null) return;
        if (d == 0) {
            level.add(root.val);
            return;
        }
        collectLevel(root.left, d - 1, level);
        collectLevel(root.right, d - 1, level);
    }

    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        int h = getHeight(root);
        for (int d = 0; d < h; d++) {
            List<Integer> level = new ArrayList<>();
            collectLevel(root, d, level);
            res.add(level);
        }
        return res;
    }
}
