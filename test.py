try:
    argu = json.loads(sys.argv[1])
except:
    raise Exception("error while loading argument")