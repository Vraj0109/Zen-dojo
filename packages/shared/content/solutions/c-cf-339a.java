import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Solution {
    public String helpfulMaths(String s) {
        List<Character> d = new ArrayList<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c != '+') d.add(c);
        }
        Collections.sort(d);
        StringBuilder r = new StringBuilder();
        for (int i = 0; i < d.size(); i++) {
            if (i > 0) r.append('+');
            r.append(d.get(i));
        }
        return r.toString();
    }
}
