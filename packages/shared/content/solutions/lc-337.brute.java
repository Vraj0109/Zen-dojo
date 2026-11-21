class Solution {
    public int rob(TreeNode root) {
        if (root == null) return 0;
        int robRoot = root.val;
        if (root.left != null) {
            robRoot += rob(root.left.left) + rob(root.left.right);
        }
        if (root.right != null) {
            robRoot += rob(root.right.left) + rob(root.right.right);
        }
        int skipRoot = rob(root.left) + rob(root.right);
        return Math.max(robRoot, skipRoot);
    }
}
