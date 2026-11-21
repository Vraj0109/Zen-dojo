import java.util.*;

class Codec {
    public String serialize(TreeNode root) {
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode cur = q.poll();
            if (cur == null) {
                sb.append("#,");
            } else {
                sb.append(cur.val).append(",");
                q.add(cur.left);
                q.add(cur.right);
            }
        }
        return sb.toString();
    }

    public TreeNode deserialize(String data) {
        if (data == null || data.isEmpty()) return null;
        String[] tokens = data.split(",");
        if (tokens.length == 0 || tokens[0].equals("#") || tokens[0].isEmpty()) return null;

        TreeNode root = new TreeNode(Integer.parseInt(tokens[0]));
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int idx = 1;

        while (!q.isEmpty() && idx < tokens.length) {
            TreeNode cur = q.poll();
            if (idx < tokens.length && !tokens[idx].equals("#")) {
                cur.left = new TreeNode(Integer.parseInt(tokens[idx]));
                q.add(cur.left);
            }
            idx++;
            if (idx < tokens.length && !tokens[idx].equals("#")) {
                cur.right = new TreeNode(Integer.parseInt(tokens[idx]));
                q.add(cur.right);
            }
            idx++;
        }
        return root;
    }
}
