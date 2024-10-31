export type RegboxAPIParams = {
  url: string;
};

export class RegboxAPI {
  protected readonly url: string;

  constructor({ url }: RegboxAPIParams) {
    this.url = url;
  }

  async getFaucet(address: string, amount: number): Promise<void> {
    const res = await fetch(`${this.url}/send-to-address`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address, amount }),
    });

    return;
  }

  async generateBlock(nblocks: number): Promise<void> {
    const res = await fetch(`${this.url}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nblocks }),
    });

    return await res.json();
  }
}
