#include <string>
#include <vector>
#include <algorithm>
#include <set>

class Solution {
public:
    std::vector<std::string> creatingStrings(std::string s) {
        std::sort(s.begin(), s.end());
        std::vector<std::string> out;
        do {
            out.push_back(s);
        } while (std::next_permutation(s.begin(), s.end()));
        return out;
    }
};
