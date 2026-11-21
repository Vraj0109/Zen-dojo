class Solution {
    private int maxArm(TreeNode node) {
        if (node == null) return 0;
        int l = Math.max(0, maxArm(node.left));
        int r = Math.max(0, maxArm(node.right));
        return node.val + Math.max(l, r);
    }

    private int best = Integer.MIN_VALUE;

    private void dfsAll(TreeNode node) {
        if (node == null) return;
        int l = Math.max(0, maxArm(node.left));
        int r = Math.max(0, maxArm(node.right));
        best = Math.max(best, node.val + l + r);
        dfsAll(node.left);
        dfsAll(node.right);
    }

    public int maxPathSum(TreeNode root) {
        best = Integer.MIN_VALUE;
        dfsAll(root);
        return best;
    }
}
