class Solution {
    private boolean ok(TreeNode n, long low, long high) {
        if (n == null) return true;
        if (n.val <= low || n.val >= high) return false;
        return ok(n.left, low, n.val) && ok(n.right, n.val, high);
    }

    public boolean isValidBST(TreeNode root) {
        return ok(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
}
