#include <string>

class Solution {
public:
    bool isValid(std::string s) {
        while (true) {
            size_t p1 = s.find("()");
            size_t p2 = s.find("[]");
            size_t p3 = s.find("{}");
            if (p1 != std::string::npos) {
                s.erase(p1, 2);
            } else if (p2 != std::string::npos) {
                s.erase(p2, 2);
            } else if (p3 != std::string::npos) {
                s.erase(p3, 2);
            } else {
                break;
            }
        }
        return s.empty();
    }
};
