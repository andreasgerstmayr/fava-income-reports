from typing import Dict, Tuple
from fava.helpers import FavaAPIException


def get_query_and_link(data: Dict[str, str]) -> Tuple[str, str]:
    if "account" in data:
        query = f"account ~ '^{data['account']}'"
        link = data.get("link", f"/beancount/account/{data['account']}/")
    elif "query" in data:
        query = data["query"]
        link = data.get("link")
    else:
        raise FavaAPIException("Neither 'query' nor 'account' found in definition.")
    return query, link
