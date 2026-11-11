class Solution {
    private TreeNode go(TreeNode node, int p, int q) {
        if (node == null) return null;
        if (node.val == p || node.val == q) return node;
        TreeNode l = go(node.left, p, q);
        TreeNode r = go(node.right, p, q);
        if (l != null && r != null) return node;
        return l != null ? l : r;
    }
    public int lowestCommonAncestor(TreeNode root, int p, int q) {
        return go(root, p, q).val;
    }
}