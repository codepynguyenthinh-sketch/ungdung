
def parse_header(value):
    if isinstance(value, str) and ';' in value:
        main, params = value.split(';', 1)
        return (main.strip(), {})
    return (value, {})

def parse_multipart(fp, pdict):
    return {}
