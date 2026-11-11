import java.util.*;

class Solution {
    private Map<Integer, Integer> pos = new HashMap<>();
    private int next = 0;

    private TreeNode build(int[] pre, int lo, int hi) {
        if (lo > hi) return null;
        int v = pre[next++];
        TreeNode node = new TreeNode(v);
        int mid = pos.get(v);
        node.left = build(pre, lo, mid - 1);
        node.right = build(pre, mid + 1, hi);
        return node;
    }

    public TreeNode buildTree(int[] preorder, int[] inorder) {
        pos.clear();
        next = 0;
        for (int i = 0; i < inorder.length; i++) pos.put(inorder[i], i);
        return build(preorder, 0, inorder.length - 1);
    }
}
