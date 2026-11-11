import java.util.*;

class Solution {
    private int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    private List<String> result = new ArrayList<>();
    private int rows, cols;

    private int[][] trieChildren;
    private String[] trieWord;
    private int trieSize;

    private int newNode() {
        int id = trieSize++;
        trieChildren[id] = new int[26];
        Arrays.fill(trieChildren[id], -1);
        trieWord[id] = null;
        return id;
    }

    private void insertWord(String w) {
        int cur = 0;
        for (int i = 0; i < w.length(); i++) {
            int idx = w.charAt(i) - 'a';
            if (trieChildren[cur][idx] == -1) {
                trieChildren[cur][idx] = newNode();
            }
            cur = trieChildren[cur][idx];
        }
        trieWord[cur] = w;
    }

    private void dfs(String[][] b, int r, int c, int node) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        String cell = b[r][c];
        if (cell.equals("#") || cell.isEmpty()) return;
        char ch = cell.charAt(0);
        int idx = ch - 'a';
        if (idx < 0 || idx >= 26 || trieChildren[node][idx] == -1) return;

        int nextNode = trieChildren[node][idx];
        if (trieWord[nextNode] != null) {
            result.add(trieWord[nextNode]);
            trieWord[nextNode] = null;
        }

        b[r][c] = "#";
        for (int[] d : dirs) {
            dfs(b, r + d[0], c + d[1], nextNode);
        }
        b[r][c] = cell;
    }

    public String[] findWords(String[][] board, String[] words) {
        int maxNodes = 1;
        for (String w : words) maxNodes += w.length();
        trieChildren = new int[maxNodes][26];
        trieWord = new String[maxNodes];
        trieSize = 0;
        newNode(); // root = 0

        for (String w : words) insertWord(w);
        rows = board.length;
        cols = board[0].length;
        result.clear();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                dfs(board, r, c, 0);
            }
        }
        return result.toArray(new String[0]);
    }
}
