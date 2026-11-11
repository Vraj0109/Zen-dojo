import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

class Solution {
    public int kindsOfItems(String[] s) {
        Set<String> seen = new HashSet<>();
        Collections.addAll(seen, s);
        return seen.size();
    }
}
