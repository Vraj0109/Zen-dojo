class Solution {
    private int depth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(depth(root.left), depth(root.right));
    }

    public int diameterOfBinaryTree(TreeNode root) {
        if (root == null) return 0;
        int throughRoot = depth(root.left) + depth(root.right);
        int leftDia = diameterOfBinaryTree(root.left);
        int rightDia = diameterOfBinaryTree(root.right);
        return Math.max(throughRoot, Math.max(leftDia, rightDia));
    }
}
