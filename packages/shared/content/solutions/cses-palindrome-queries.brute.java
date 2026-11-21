import java.util.*;

public class Solution {
    public String[] palindromeQueries(String s, String[][] queries) {
        char[] arr = s.toCharArray();
        List<String> ans = new ArrayList<>();
        for (String[] q : queries) {
            if (q[0].equals("1")) {
                int k = Integer.parseInt(q[1]);
                char c = q[2].charAt(0);
                arr[k - 1] = c;
            } else {
                int a = Integer.parseInt(q[1]) - 1;
                int b = Integer.parseInt(q[2]) - 1;
                boolean isPal = true;
                while (a < b) {
                    if (arr[a] != arr[b]) {
                        isPal = false;
                        break;
                    }
                    a++;
                    b--;
                }
                if (isPal) ans.add("YES");
                else ans.add("NO");
            }
        }
        return ans.toArray(new String[0]);
    }
}
