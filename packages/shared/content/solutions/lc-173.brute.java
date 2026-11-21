import java.util.*;

class BSTIterator {
    private final List<Integer> vals = new ArrayList<>();
    private int idx = 0;

    private void inorder(TreeNode node) {
        if (node == null) return;
        inorder(node.left);
        vals.add(node.val);
        inorder(node.right);
    }

    public BSTIterator(TreeNode root) {
        inorder(root);
    }

    public int next() {
        return vals.get(idx++);
    }

    public boolean hasNext() {
        return idx < vals.size();
    }
}
