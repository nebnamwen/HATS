all: clean images

.PHONY: clean images

images:
	python build_pdfs.py

clean:
	rm static/images/*/*
