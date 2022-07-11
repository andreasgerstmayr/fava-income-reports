import datetime
import yaml
from beancount.query.query import run_query
from fava.context import g
from fava.ext import FavaExtensionBase
from fava.helpers import FavaAPIException
from fava.core.conversion import get_market_value
from . import utils


class Sankey(FavaExtensionBase):

    report_title = "Sankey"

    def _get_node_value(self, node):
        operating_currency = self.ledger.options["operating_currency"][0]
        return node.balance_children.reduce(get_market_value, self.ledger.price_map, g.filtered.end_date).get(
            operating_currency
        )

    def _iter_children_first(self, root):
        """skip accounts with only one children, and return the first account"""
        root_value = self._get_node_value(root)
        children = []
        for node in root.children:
            value = self._get_node_value(node)
            if not value:
                continue
            elif value == root_value:
                return self._iter_children_first(node)
            else:
                children.append(node)
        return children

    def _has_single_child(self, root):
        root_value = self._get_node_value(root)
        for node in root.children:
            value = self._get_node_value(node)
            if not value:
                continue
            return value == root_value
        return False

    def _iter_children_last(self, root):
        """skip accounts with only one children, and return the last account"""
        children = []
        for node in root.children:
            value = self._get_node_value(node)
            if not value:
                continue
            if not self._has_single_child(node):
                children.append(node)
            else:
                children.extend(self._iter_children_last(node))
        return children

    def sankey_full(self):
        income = g.filtered.root_tree.get("Income")
        expenses = g.filtered.root_tree.get("Expenses")

        nodes = [{"name": "Income"}]
        links = []

        def add_income(root):
            for node in self._iter_children_last(root):
                value = self._get_node_value(node)
                if not value:
                    continue

                nodes.append({"name": node.name, "link": f"/beancount/account/{node.name}/"})
                links.append({"source": node.name, "target": root.name, "value": -value})
                add_income(node)

        def add_expenses(root, name=None):
            for node in self._iter_children_last(root):
                value = self._get_node_value(node)
                if not value:
                    continue

                nodes.append({"name": node.name, "link": f"/beancount/account/{node.name}/"})
                links.append({"source": name or root.name, "target": node.name, "value": value})
                add_expenses(node)

        add_income(income)
        add_expenses(expenses, name="Income")

        total_income = self._get_node_value(income) or 0
        total_expenses = self._get_node_value(expenses) or 0
        savings = -total_income - total_expenses
        if savings > 0:
            nodes.append({"name": "Savings"})
            links.append({"source": "Income", "target": "Savings", "value": savings})

        date_first = g.filtered._date_first
        date_last = g.filtered._date_last - datetime.timedelta(days=1)
        operating_currency = self.ledger.options["operating_currency"][0]
        return {
            "date_first": date_first,
            "date_last": date_last,
            "currency": operating_currency,
            "chart": {
                "nodes": nodes,
                "links": links,
                "days": (date_last - date_first).days + 1,
            },
        }

    def _query(self, where: str):
        bql = f"SELECT CONVERT(VALUE(SUM(position)), 'EUR') AS val WHERE {where}"
        _, rrows = run_query(g.filtered.entries, self.ledger.options, bql)
        if rrows:
            row = rrows[0]
            if row and not row.val.is_empty():
                return row.val.get_only_position().units.number
        return 0

    def sankey_custom(self):
        config_file = "sankey.yaml"
        try:
            with open(config_file, "r") as f:
                config = yaml.safe_load(f)
        except Exception as ex:
            raise FavaAPIException(f"Cannot read configuration file {config_file}: " + str(ex))

        income = []
        expenses = []
        for node in config.get("income", []):
            query, link = utils.get_query_and_link(node)
            invert = node.get("invert", True)
            income.append(
                {
                    "name": node.get("name", "Unnamed"),
                    "link": link,
                    "value": (-1 if invert else 1) * self._query(query),
                    "ignore": node.get("ignore", False),
                }
            )
        for node in config.get("expenses", []):
            query, link = utils.get_query_and_link(node)
            invert = node.get("invert", False)
            expenses.append(
                {
                    "name": node.get("name", "Unnamed"),
                    "link": link,
                    "value": (-1 if invert else 1) * self._query(query),
                    "ignore": node.get("ignore", False),
                }
            )

        income.append(
            {
                "name": "Other Income",
                "link": "/beancount/account/Income/",
                "value": -self._query("account ~ '^Income:'")
                - sum(node["value"] for node in income if not node["ignore"]),
            }
        )
        expenses.append(
            {
                "name": "Other Expenses",
                "link": "/beancount/account/Expenses/",
                "value": self._query("account ~ '^Expenses:'")
                - sum(node["value"] for node in expenses if not node["ignore"]),
            }
        )

        nodes = [{"name": "Budget"}]
        links = []
        for node in income:
            if node["value"] > 1:
                nodes.append(node)
                links.append({"source": node["name"], "target": "Budget", "value": node["value"]})

        for node in expenses:
            if node["value"] > 1:
                nodes.append(node)
                links.append({"source": "Budget", "target": node["name"], "value": node["value"]})

        date_first = g.filtered._date_first
        date_last = g.filtered._date_last - datetime.timedelta(days=1)
        operating_currency = self.ledger.options["operating_currency"][0]
        return {
            "date_first": date_first,
            "date_last": date_last,
            "currency": operating_currency,
            "chart": {
                "nodes": nodes,
                "links": links,
                "days": (date_last - date_first).days + 1,
            },
        }
