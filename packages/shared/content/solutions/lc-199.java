import java.util.*;

class Solution {
    public int[] rightSideView(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        if (root == null) return new int[0];
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            int n = q.size();
            for (int i = 0; i < n; i++) {
                TreeNode x = q.poll();
                if (i == n - 1) out.add(x.val);
                if (x.left != null) q.add(x.left);
                if (x.right != null) q.add(x.right);
            }
        }
        return out.stream().mapToInt(Integer::intValue).toArray();
    }
}
