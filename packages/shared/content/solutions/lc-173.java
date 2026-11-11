import java.util.*;

class BSTIterator {
    private final Deque<TreeNode> st = new ArrayDeque<>();

    private void pushLeft(TreeNode node) {
        while (node != null) {
            st.push(node);
            node = node.left;
        }
    }

    public BSTIterator(TreeNode root) {
        pushLeft(root);
    }

    public int next() {
        TreeNode curr = st.pop();
        pushLeft(curr.right);
        return curr.val;
    }

    public boolean hasNext() {
        return !st.isEmpty();
    }
}
