#include <vector>
#include <string>

class Solution {
public:
    std::vector<std::string> grayCode(int n) {
        if (n == 1) return {"0", "1"};
        std::vector<std::string> prev = grayCode(n - 1);
        std::vector<std::string> out;
        for (const auto& s : prev) out.push_back("0" + s);
        for (auto it = prev.rbegin(); it != prev.rend(); ++it) out.push_back("1" + *it);
        return out;
    }
};
