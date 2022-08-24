from typing import Dict, Tuple
from urllib.parse import quote_plus
from fava.helpers import FavaAPIException


def get_query_and_link(data: Dict[str, str]) -> Tuple[str, str]:
    if "account" in data:
        query = f"WHERE account ~ '^{data['account']}'"
        link = data.get("link", f"/beancount/account/{data['account']}/")
    elif "query" in data:
        query = data["query"]
        link = data.get("link")
    else:
        raise FavaAPIException("Neither 'query' nor 'account' found in definition.")

    # HACK: basic support for not urlescaped links by escaping #
    link = link.replace("#", quote_plus("#"))
    return query, link
